import bcrypt from "bcryptjs";
import mongoose, { Schema } from "mongoose";

const userSchema = new Schema({
  email: { type: String, required: true, unique: true },
  contact: { type: String },
  password: {
    type: String,
    required: function (this: { googleId?: string }) {
      return !this.googleId;
    },
  },
  fullname: { type: String, required: true },
  role: { type: String, enum: ["buyer", "seller"], default: "buyer" },
  googleId: { type: String },
});

userSchema.pre("save", async function () {
  if (!this.isModified("password") || !this.password) return;
  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.comparePassword = async function (password: string) {
  return bcrypt.compare(password, this.password);
};

const User = mongoose.models.user ?? mongoose.model("user", userSchema);
export default User;
