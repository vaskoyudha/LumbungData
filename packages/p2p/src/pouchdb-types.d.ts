declare namespace PouchDB {
  namespace Core {
    interface IdMeta {
      _id: string;
    }

    interface GetMeta {
      _rev?: string;
    }
  }

  interface Database {
    allDocs(): Promise<{
      rows: Array<{
        id: string;
        value?: {
          rev?: string;
        };
      }>;
    }>;
    get(id: string): Promise<Core.IdMeta & Core.GetMeta & Record<string, unknown>>;
    put(doc: Record<string, unknown>): Promise<unknown>;
  }
}
