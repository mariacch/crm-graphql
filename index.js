const { ApolloServer } = require("@apollo/server");
const { startStandaloneServer } = require('@apollo/server/standalone');
const typeDefs =require('./db/schema')
const resolvers =require('./db/resolvers')
const conectarDB= require('./config/db')
const jwt = require('jsonwebtoken')
require("dotenv").config({ path: "variables.env" });
 
{/**dependencias iniciales

npm i @apollo/server @graphql-tools/schema cors dotenv express graphql graphql-tag

*/}
//conectar a la bd
conectarDB()
 
// iniciar servidor
async function startServer() {
  const server = new ApolloServer({
    typeDefs,
    resolvers,
  context: ({ req }) => {
     //console.log(req);

      // si no se pasa ese header llamado authorization asigne un string vacio
      const token = req.headers['Authorization'] || '';

      if (token) {
          try {

              // importo jwt para verificar el token
              const usuario = jwt.verify(token, process.env.SECRETA);

              console.log(usuario);

              return {
                  usuario
              }


          } catch (error) {

              console.log("Hubo un error");
              console.log(error);

          }
      }} 

     
  });
 
  const { url } = await startStandaloneServer(server, {
    listen: { port: 4000 },
    context: (({ req }) => {
      console.log(req.headers.authorization);
  
      return req.headers.authorization;
    }),
    //csrfPrevention: true,
    //cache: 'bounded',
   
  });
 
  console.log(`🚀 Server ready at: ${url}`);
}
 
 
startServer().catch((error) => {
  console.error("Error starting the server:", error);
});