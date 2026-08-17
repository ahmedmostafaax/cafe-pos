import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "الاسم مطلوب"],
      trim: true,
    },
    username: {
      type: String,
      required: [true, "اسم المستخدم مطلوب"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, "كلمة المرور مطلوبة"],
      minlength: 6,
      select: false,
    },
    role: {
      type: String,
      enum: ["admin", "front", "kitchen", "bar"],
      default: "front",
    },
    shift: {
      type: String,
      enum: ["morning", "evening", "night", "full_day"],
      default: "morning",
    },
    phone: {
      type: String,
      default: "",
      trim: true,
    },
    salary: {
      type: Number,
      default: 0,
    },
    jobTitle: {
      type: String,
      default: "",
      trim: true,
    },
    notes: {
      type: String,
      default: "",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

const User = mongoose.models.User || mongoose.model("User", userSchema);
export default User;
