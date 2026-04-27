import mongoose, { Schema, type InferSchemaType } from 'mongoose';

const deviceSchema = new Schema(
  {
    deviceId: { type: String, required: true, unique: true, index: true },
    apiKey: { type: String, required: true, unique: true, index: true },

    name: { type: String },
    phoneNumber: { type: String },

    temperatureLimit: { type: Number },
    lastAlertAt: { type: Date }
  },
  { timestamps: true }
);

export type Device = InferSchemaType<typeof deviceSchema>;

export type DeviceDoc = mongoose.HydratedDocument<Device>;

export const DeviceModel: mongoose.Model<Device> =
  (mongoose.models.Device as mongoose.Model<Device>) || mongoose.model<Device>('Device', deviceSchema);
