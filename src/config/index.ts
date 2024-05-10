require('dotenv').config();

class Config {
  DATABASE_URL: string = process.env.DATABASE_URL;
  PRODUCT_SERVICE_URL: string = process.env.PRODUCT_SERVICE_URL;
  UUID_VERSION: '3' | '4' | '5' = '4';
}

export const config = new Config();
