const { ApolloServer } = require("@apollo/server");
const { startStandaloneServer } = require('@apollo/server/standalone');
const typeDefs =require('./db/schema')
const resolvers =require('./db/resolvers')
const conectarDB= require('./config/db')
 
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
  });
 
  const { url } = await startStandaloneServer(server, {
    listen: { port: 4000 },
  });
 
  console.log(`🚀 Server ready at: ${url}`);
}
 
 
startServer().catch((error) => {
  console.error("Error starting the server:", error);
});