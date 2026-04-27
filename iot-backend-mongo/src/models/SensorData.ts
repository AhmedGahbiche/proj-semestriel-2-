import mongoose, { Schema, type InferSchemaType, type Types } from 'mongoose';

const sensorDataSchema = new Schema(
  {
    device: { type: Schema.Types.ObjectId, ref: 'Device', required: true, index: true },
    deviceId: { type: String, required: true, index: true },

    temperature: { type: Number },
    humidity: { type: Number },

    timestamp: { type: Date, required: true, index: true },

    // Optional arbitrary payload from device
    raw: { type: Schema.Types.Mixed }
  },
  { timestamps: true }
);

sensorDataSchema.index({ deviceId: 1, timestamp: -1 });

export type SensorData = InferSchemaType<typeof sensorDataSchema> & { device: Types.ObjectId };

export type SensorDataDoc = mongoose.HydratedDocument<SensorData>;

export const SensorDataModel: mongoose.Model<SensorData> =
  (mongoose.models.SensorData as mongoose.Model<SensorData>) ||
  mongoose.model<SensorData>('SensorData', sensorDataSchema);
