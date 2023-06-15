const Usuario = require("../models/Usuario");
const Producto = require("../models/Producto");
const bcryptjs = require("bcryptjs");
require("dotenv").config({ path: "variables.env" });
const jwt = require("jsonwebtoken");
const Cliente = require("../models/Cliente");
const Pedido = require("../models/Pedido");

const crearToken = (usuario, secreta, expiresIn) => {
  console.log(usuario);
  const { id, email, nombre, apellido } = usuario;
  return jwt.sign({ id, email, nombre, apellido }, secreta, { expiresIn });
};

// Resolvers
const resolvers = {
  Query: {
    //Usuarios
    obtenerUsuario: async (_, { token }) => {
      const usuarioId = await jwt.verify(token, process.env.SECRETA);
      return usuarioId;
    },
    //productos
    obtenerProductos: async (_, {}) => {
      try {
        const productos = await Producto.find({});
        return productos;
      } catch (error) {
        console.log(error);
      }
    },
    obtenerProducto: async (_, { id }) => {
      //revisar si el producto existe o no
      const producto = await Producto.findById(id);
      if (!producto) {
        throw new Error("Producto no encontrado");
      }
      return producto;
    },
    //clientes
    obtenerClientes: async () => {
      try {
        const clientes = await Cliente.find({});
        return clientes;
      } catch (error) {
        console.log(error);
      }
    },
    obtenerClientesVendedor: async (_, {}, contextValue) => {
      try {
        let resultado = "";
        for (let key in contextValue) {
          resultado += contextValue[key];
        }

        const clientes = await Cliente.find({ vendedor: resultado });
        return clientes;
      } catch (error) {
        console.log(error);
      }
    },
    obtenerCliente: async (_, { id }, contextValue) => {
      let resultado = "";
      for (let key in contextValue) {
        resultado += contextValue[key];
      }

      //Revisar si el cliente existe o no
      const cliente = await Cliente.findById(id);
      if (!cliente) {
        throw new Error("Cliente no encontrado");
      }

      //quien lo creo es el unico que puede verlo
      if (cliente.vendedor.toString() !== resultado) {
        throw new Error("No tienes las credenciales");
      }
      return cliente;
    },
    //pedidos
    obtenerPedidos: async () => {
      try {
        const pedidos = await Pedido.find({});
        return pedidos;
      } catch (error) {
        console.log(error);
      }
    },
    //pedidos por vendedor
    obtenerPedidosVendedor: async (_, {}, contextValue) => {
      try {
        let resultado = "";
        for (let key in contextValue) {
          resultado += contextValue[key];
        }
        const pedidos = await Pedido.find({ vendedor: resultado });
        return pedidos;
      } catch (error) {
        console.log(error);
      }
    },
    obtenerPedido: async (_, { id }, contextValue) => {
      try {
        let resultado = "";
        for (let key in contextValue) {
          resultado += contextValue[key];
        }

        //si el pedido existe o no
        const pedido = await Pedido.findById(id);
        if (!pedido) {
          throw new Error("pedido no encontrado");
        }
        //solo quien lo creo puede verlo
        if (pedido.vendedor.toString() !== resultado) {
          throw new Error("no tienes las credenciales");
        }
        return pedido;
      } catch (error) {
        console.log(error);
      }
    },
    obtenerPedidosEstado: async (_, { estado }, contextValue) => {
      let resultado = "";
      for (let key in contextValue) {
        resultado += contextValue[key];
      }
      //busca en pedidos los que tenga vendedor y estado(para obtener en pedidos los estados)
      const pedidos = await Pedido.find({ vendedor: resultado, estado });

      return pedidos;
    },
    mejoresClientes: async () => {
      //para saber quienes son los mejores clientes vamos a consultar el modelo de pedido
      //para saber cuanto fue el pedido y cuantos estan completados
      //para eso lo hare con la funcion aggreate para tomar distintos valores y realizar distintas operaciones (esta funcion al final retorna un solo resultado)
      //con $ match filtra (para traer solo los pedidos con estado de completado)
      //con $ group consultaremos el total que ha comprado el cliente(con el nombre del modelo (cliente) en minusculas y el campo (que es total))
      // en el total se hace una suma de todo lo que el cliente haya comprado con $ sum
      // ahora quiero obtener la info del cliente con $ lookup
      // con $ sort cambia el orden de mayor a menor en el total
      const clientes = await Pedido.aggregate([
        { $match: { estado: "COMPLETADO" } },
        {
          $group: {
            _id: "$cliente",
            total: { $sum: "$total" },
          },
        },
        {
          $lookup: {
            from: "clientes",
            localField: "_id",
            foreignField: "_id",
            as: "cliente",
          },
        },
        {
          $sort: { total: -1 },
        },
      ]);

      return clientes;
    },
    mejoresVendedores: async () => {
      // $ limit es para traer un resultado de solo 5 vendedores
      const vendedores = await Pedido.aggregate([
        { $match: { estado: "COMPLETADO" } },
        {
          $group: {
            _id: "$vendedor",
            total: { $sum: "$total" },
          },
        },
        {
          $lookup: {
            from: "usuarios",
            localField: "_id",
            foreignField: "_id",
            as: "vendedor",
          },
        },
        {
          $limit: 3,
        },
        {
          $sort: { total: -1 },
        },
      ]);
      return vendedores;
    },
    buscarProducto:async(_,{texto})=>{
      const productos= await Producto.find({$text:{$search:texto}}).limit(10)
      return productos
    }

  },
  Mutation: {
    nuevoUsuario: async (_, { input }) => {
      const { email, password } = input;
      //revisar si el usuario ya esta registrado
      const existeUsuario = await Usuario.findOne({ email });
      if (existeUsuario) {
        throw new Error("El usuario ya esta registrado");
      }

      //hashear el passwordd
      const salt = bcryptjs.genSaltSync(10);
      input.password = bcryptjs.hashSync(password, salt);

      try {
        //guardarlo en la bd
        const usuario = new Usuario(input);
        usuario.save();
        return usuario;
      } catch (error) {
        console.log(error);
      }
    },
    autenticarUsuario: async (_, { input }) => {
      const { email, password } = input;
      //si el usuario existe
      const existeUsuario = await Usuario.findOne({ email });
      if (!existeUsuario) {
        throw new Error("El usuario no existe");
      }
      //revisar si el password es correcto
      const passwordCorrecto = await bcryptjs.compare(
        password,
        existeUsuario.password
      );
      if (!passwordCorrecto) {
        throw new Error("El password es incorrecto");
      }
      //crear el token
      return {
        token: crearToken(existeUsuario, process.env.SECRETA, "24h"),
      };
    },
    nuevoProducto: async (_, { input }) => {
      try {
        const producto = new Producto(input);
        //almacenar en la bd
        const resultado = await producto.save();
        return resultado;
      } catch (error) {
        console.log(error);
      }
    },
    actualizarProducto: async (_, { id, input }) => {
      //revisar si el producto existe o no
      let producto = await Producto.findById(id);
      if (!producto) {
        throw new Error("Producto no encontrado");
      }
      //guardarlo en la bd
      producto = await Producto.findOneAndUpdate({ _id: id }, input, {
        new: true,
      });

      return producto;
    },
    eliminarProducto: async (_, { id }) => {
      //revisar si el producto existe o no
      let producto = await Producto.findById(id);
      if (!producto) {
        throw new Error("Producto no encontrado");
      }
      //eliminar
      await Producto.findOneAndDelete({ _id: id });
      return "Producto eliminado";
    },
    nuevoCliente: async (_, { input }, contextValue) => {
      let resultado = "";
      for (let key in contextValue) {
        resultado += contextValue[key];
      }

      const { email } = input;
      //verificar si el cliente ya esta registrado
      const cliente = await Cliente.findOne({ email });
      if (cliente) {
        throw new Error("Ese cliente ya esta registrado");
      }
      const nuevoCliente = new Cliente(input);
      //asignar el vendedor
      nuevoCliente.vendedor = resultado;

      //guardarlo en la bd
      try {
        const resultado = await nuevoCliente.save();
        console.log(resultado);
        return resultado;
      } catch (error) {
        console.log(error);
      }
    },
    actualizarCliente: async (_, { id, input }, contextValue) => {
      //verificar si existe o no
      let cliente = await Cliente.findById(id);
      if (!cliente) {
        throw new Error("Ese Cliente no existe ");
      }
      //verificar si el vendedor esquien  edita
      let resultado = "";
      for (let key in contextValue) {
        resultado += contextValue[key];
      }
      if (cliente.vendedor.toString() !== resultado) {
        throw new Error("No tienes las credenciales");
      }

      //guardar el cliente
      cliente = await Cliente.findOneAndUpdate({ _id: id }, input, {
        new: true,
      });
      return cliente;
    },
    eliminarCliente: async (_, { id }, contextValue) => {
      //verificar si existe o no
      let cliente = await Cliente.findById(id);
      if (!cliente) {
        throw new Error("Ese Cliente no existe ");
      }
      //verificar si el vendedor esquien  elimina
      let resultado = "";
      for (let key in contextValue) {
        resultado += contextValue[key];
      }
      if (cliente.vendedor.toString() !== resultado) {
        throw new Error("No tienes las credenciales");
      }
      //elimina
      await Cliente.findOneAndDelete({ _id: id });
      return "Cliente eliminado";
    },
    nuevoPedido: async (_, { input }, contextValue) => {
      const { cliente } = input;
      //verificar si el cliente existe o no
      let Findcliente = await Cliente.findById(cliente);
      if (!Findcliente) {
        throw new Error("Ese Cliente no existe ");
      }
      //verificar si el cliente es del vendedor
      let resultado = "";
      for (let key in contextValue) {
        resultado += contextValue[key];
      }
      if (Findcliente.vendedor.toString() !== resultado) {
        throw new Error("No tienes las credenciales");
      }

      //revisar que el stock este disponible (se usa operador asincrono for await)
      //itera con for await y evalua si excede o no la cantidad disponible
      for await (const articulo of input.pedido) {
        const { id } = articulo;
        const producto = await Producto.findById(id);
        if (articulo.cantidad > producto.existencia) {
          throw new Error(
            `El articulo:${producto.nombre} excede la cantidad disponible`
          );
        } else {
          //restar la cantidad a lo disponible
          producto.existencia = producto.existencia - articulo.cantidad;
          //guardo
          await producto.save();
        }
      }
      //crear pedido
      const nuevoPedido = new Pedido(input);

      //asignarle un vendedor
      nuevoPedido.vendedor = resultado;

      //guardarlo en la bd
      const resultSave = await nuevoPedido.save();
      return resultSave;
    },
    actualizarPedido: async (_, { id, input }, contextValue) => {
      const { cliente, pedido } = input;
      //si el pedido existe
      const existePedido = await Pedido.findById(id);
      if (!existePedido) {
        throw new Error("El pedido no existe");
      }

      //si el cliente existe
      const existeCliente = await Cliente.findById(cliente);
      if (!existeCliente) {
        throw new Error("El cliente no existe");
      }

      //si el cliente y pedido pertenece al vendedor
      let resultado = "";
      for (let key in contextValue) {
        resultado += contextValue[key];
      }
      if (existeCliente.vendedor.toString() !== resultado) {
        throw new Error("No tienes las credenciales");
      }

      //revisar el stock
      if (pedido) {
        for await (const articulo of pedido) {
          const { id } = articulo;
          const producto = await Producto.findById(id);
          if (articulo.cantidad > producto.existencia) {
            throw new Error(
              `El articulo:${producto.nombre} excede la cantidad disponible`
            );
          } else {
            //restar la cantidad a lo disponible
            producto.existencia = producto.existencia - articulo.cantidad;
            //guardo
            await producto.save();
          }
        }
      }

      //guardar el pedido
      const resultadoPedido = await Pedido.findOneAndUpdate(
        { _id: id },
        input,
        { new: true }
      );
      return resultadoPedido;
    },
    eliminarPedido: async (_, { id }, contextValue) => {
      //Verificar si el pedido existe o no
      const pedido = await Pedido.findById(id);
      if (!pedido) {
        throw new Error("El pedido no existe");
      }

      //verificar si el vendedor es quien lo borra
      let resultado = "";
      for (let key in contextValue) {
        resultado += contextValue[key];
      }
      if (pedido.vendedor.toString() !== resultado) {
        throw new Error("No tienes las credenciales");
      }

      //eliminar de la bd
      await Pedido.findOneAndDelete({ _id: id });
      return "Pedido eliminado";
    },
  },
};

module.exports = resolvers;
