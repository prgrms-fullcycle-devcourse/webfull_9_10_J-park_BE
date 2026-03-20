import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: '등불 API',
      version: '1.0.0',
      description: '발등에 불 떨어지는 상황은 이제 싫다!!',
    },
    servers: [
      {
        url: 'http://localhost:3000',
      },
    ],
  },
  apis: ['./src/**/*.ts', './src/**/*.yaml'],
};

export const swaggerSpec = swaggerJsdoc(options);