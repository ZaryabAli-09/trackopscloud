import mongoose, { type ClientSession } from "mongoose";

type TransactionWork<T> = (session?: ClientSession) => Promise<T>;

function supportsTransactions() {
  type MongoClientWithTopology = ReturnType<typeof mongoose.connection.getClient> & {
    topology?: { description?: { type?: string } };
  };
  const client = mongoose.connection.getClient() as MongoClientWithTopology;
  const topologyType = client.topology?.description?.type;
  return topologyType !== "Single" && topologyType !== "Standalone";
}

export async function withDatabaseTransaction<T>(work: TransactionWork<T>): Promise<T> {
  const session = await mongoose.startSession();
  try {
    if (!supportsTransactions()) return await work();
    return await session.withTransaction(() => work(session));
  } finally {
    await session.endSession();
  }
}
