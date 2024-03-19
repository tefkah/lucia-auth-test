declare global {
  namespace NodeJS {
    interface ProcessEnv {
      DATABASE_PATH: string;
      GITHUB_CLIENT_ID: string;
      GITHUB_CLIENT_SECRET: string;
    }
  }
}
export {};
