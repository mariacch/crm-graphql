const Usuario = require('../models/Usuario')
const Producto = require('../models/Producto')
const bcryptjs = require('bcryptjs')
require('dotenv').config({path:'variables.env'})
const jwt = require('jsonwebtoken')

const crearToken=(usuario,secreta,expiresIn)=>{
console.log(usuario)
const {id,email,nombre,apellido}=usuario
return jwt.sign({id,email,nombre,apellido},secreta,{expiresIn})
}

  // Resolvers
const resolvers = {
    Query: {
      //Usuarios
     obtenerUsuario:async(_,{token})=>{
      const usuarioId= await jwt.verify(token,process.env.SECRETA)
      return usuarioId

     },
     //productos
     obtenerProductos:async(_,{})=>{
      try {
        const productos= await Producto.find({})
        return productos
      } catch (error) {
        console.log(error)
      }
     },
     obtenerProducto:async(_,{id})=>{
      //revisar si el producto existe o no 
      const producto = await Producto.findById(id)
      if(!producto){
        throw new Error ('Producto no encontrado')
      }
      return producto
     }
    },
    Mutation:{
      nuevoUsuario:async(_,{input})=>{
        const {email, password}=input
        //revisar si el usuario ya esta registrado
        const existeUsuario= await Usuario.findOne({email})
        if(existeUsuario){
          throw new Error ('El usuario ya esta registrado')
        }

        //hashear el passwordd
        const salt = bcryptjs.genSaltSync(10);
        input.password = bcryptjs.hashSync(password, salt);
        
        try {
          //guardarlo en la bd
          const usuario = new Usuario(input)
          usuario.save()
          return usuario
          
        } catch (error) {
          console.log(error)
        }
      },
      autenticarUsuario:async(_,{input})=>{
        const {email,password}= input
        //si el usuario existe
        const existeUsuario= await Usuario.findOne({email})
        if(!existeUsuario){
          throw new Error ('El usuario no existe')
        }
        //revisar si el password es correcto
        const passwordCorrecto = await bcryptjs.compare(password,existeUsuario.password)
        if(!passwordCorrecto){
          throw new Error ('El password es incorrecto')
        }
        //crear el token
        return{
          token: crearToken(existeUsuario,process.env.SECRETA,'24h')
        }


      },
      nuevoProducto:async(_,{input})=>{
        try {
          const producto = new Producto(input);
          //almacenar en la bd
          const resultado= await producto.save()
          return resultado
        } catch (error) {
          console.log(error)
        }
      },
      actualizarProducto:async(_,{id,input})=>{
        //revisar si el producto existe o no
        let  producto = await Producto.findById(id)
        if(!producto){
          throw new Error('Producto no encontrado')
        }
        //guardarlo en la bd
        producto= await Producto.findOneAndUpdate({_id:id},input,{new:true})

        return producto

      },
      eliminarProducto:async(_,{id})=>{
  //revisar si el producto existe o no
  let  producto = await Producto.findById(id)
  if(!producto){
    throw new Error('Producto no encontrado')
  }
  //eliminar
  await Producto.findOneAndDelete({_id:id})
  return 'Producto eliminado'

      }





    }
  };

  module.exports=resolvers