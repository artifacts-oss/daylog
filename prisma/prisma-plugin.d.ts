declare module '@prisma/nextjs-monorepo-workaround-plugin' {
  import { WebpackPluginInstance } from 'webpack';

  export class PrismaPlugin implements WebpackPluginInstance {
    apply(compiler: any): void;
  }
}
