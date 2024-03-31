options = {
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'JWT Authentication API',
        version: '1.0.0',
        description: 'API documentation for JWT authentication',
      },
      servers: [
        {
          url: `http://localhost:${process.env.PORT}`, // Change this based on your server URL
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
    },
    apis: ['./app.js'], // Specify the path to your route files
  };

  module.exports = {options}
  