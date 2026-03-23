const mongoose = require("mongoose");

const expenseSchema = new mongoose.Schema(
  {
    product: String,
    amount: Number,
    image: String,
    roomId: String,
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    userName: String,
    userEmail: String,
    paidBy: String,
    category: {
      type: String,
      enum: ["Food", "Rent", "EB", "Internet"],
      default: "Food",
    },
    participants: {
      type: mongoose.Schema.Types.Mixed,
      default: 1,
    },
    splitAmount: {
      type: Number,
      default: 0,
    },
    settlementStatus: {
      type: String,
      enum: ["pending", "settled"],
      default: "pending",
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Expense", expenseSchema);
