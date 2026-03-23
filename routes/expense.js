const router = require("express").Router();
const Expense = require("../models/Expense");
const User = require("../models/User");
const auth = require("../middleware/authMiddleware");
const upload = require("../middleware/upload");

const ALLOWED_CATEGORIES = ["Food", "Rent", "EB", "Internet"];

const firstNonEmpty = (...values) => {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
};

const normalizeParticipants = (participants) => {
  if (Array.isArray(participants)) {
    return participants.filter(Boolean);
  }

  if (typeof participants === "string") {
    const trimmed = participants.trim();

    if (!trimmed) {
      return 1;
    }

    if (trimmed.startsWith("[")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed.filter(Boolean);
        }
      } catch (err) {
        // Fall back to scalar parsing below when JSON parsing fails.
      }
    }

    const numericValue = Number(trimmed);
    if (Number.isFinite(numericValue) && numericValue > 0) {
      return numericValue;
    }

    return trimmed;
  }

  if (typeof participants === "number" && participants > 0) {
    return participants;
  }

  return 1;
};

const getParticipantCount = (participants) => {
  if (Array.isArray(participants)) {
    return participants.length || 1;
  }

  const numericValue = Number(participants);
  return Number.isFinite(numericValue) && numericValue > 0 ? numericValue : 1;
};

const normalizeCategory = (category) => {
  return ALLOWED_CATEGORIES.includes(category) ? category : "Food";
};

const buildExpensePayload = ({ body, file, user, userId, isUpdate = false }) => {
  const payload = {};
  const amount =
    body.amount !== undefined ? Number(body.amount) || 0 : undefined;
  const participants =
    body.participants !== undefined
      ? normalizeParticipants(body.participants)
      : undefined;
  const participantCount =
    participants !== undefined ? getParticipantCount(participants) : 1;
  const userName = firstNonEmpty(body.userName, user?.name);
  const userEmail = firstNonEmpty(body.userEmail, user?.email);
  const paidBy = firstNonEmpty(body.paidBy, userName, userEmail, "Unknown");

  if (!isUpdate || body.product !== undefined) {
    payload.product = body.product;
  }

  if (!isUpdate || amount !== undefined) {
    payload.amount = amount ?? 0;
  }

  if (file) {
    payload.image = file.filename;
  } else if (!isUpdate) {
    payload.image = "";
  }

  if (!isUpdate) {
    payload.userId = userId;
  }

  if (!isUpdate || body.roomId !== undefined) {
    payload.roomId = body.roomId;
  }

  if (!isUpdate || body.userName !== undefined) {
    payload.userName = userName;
  }

  if (!isUpdate || body.userEmail !== undefined) {
    payload.userEmail = userEmail;
  }

  if (
    !isUpdate ||
    body.paidBy !== undefined ||
    body.userName !== undefined ||
    body.userEmail !== undefined ||
    !paidBy
  ) {
    payload.paidBy = paidBy;
  }

  if (!isUpdate || body.category !== undefined) {
    payload.category = normalizeCategory(body.category);
  }

  if (!isUpdate || body.participants !== undefined) {
    payload.participants = participants ?? 1;
  }

  if (!isUpdate || body.splitAmount !== undefined) {
    const splitAmount =
      body.splitAmount !== undefined
        ? Number(body.splitAmount) || 0
        : (amount || 0) / participantCount;

    payload.splitAmount = splitAmount || (amount || 0) / participantCount;
  }

  if (!isUpdate || body.settlementStatus !== undefined) {
    payload.settlementStatus =
      body.settlementStatus === "settled" ? "settled" : "pending";
  }

  if (!isUpdate || body.status !== undefined) {
    payload.status =
      typeof body.status === "string" && body.status.trim()
        ? body.status.trim()
        : "pending";
  }

  return payload;
};

const withPaidByFallback = (expenseDoc) => {
  const expense =
    typeof expenseDoc.toObject === "function" ? expenseDoc.toObject() : expenseDoc;

  return {
    ...expense,
    paidBy: firstNonEmpty(
      expense.paidBy,
      expense.userName,
      expense.userEmail,
      "Unknown"
    ),
  };
};

const enrichExpensesWithUserDetails = async (expenseDocs) => {
  const expenses = expenseDocs.map(withPaidByFallback);
  const missingUserDetails = expenses.filter((expense) => {
    return (
      expense.userId &&
      !firstNonEmpty(expense.paidBy, expense.userName, expense.userEmail)
    );
  });

  if (!missingUserDetails.length) {
    return expenses;
  }

  const userIds = [
    ...new Set(missingUserDetails.map((expense) => String(expense.userId))),
  ];
  const users = await User.find({ _id: { $in: userIds } }).select("name email");
  const userMap = new Map(users.map((user) => [String(user._id), user]));

  return expenses.map((expense) => {
    const user = expense.userId ? userMap.get(String(expense.userId)) : null;
    if (!user) {
      return expense;
    }

    const userName = firstNonEmpty(expense.userName, user.name);
    const userEmail = firstNonEmpty(expense.userEmail, user.email);

    return {
      ...expense,
      userName,
      userEmail,
      paidBy: firstNonEmpty(expense.paidBy, userName, userEmail, "Unknown"),
    };
  });
};

router.post("/", auth, upload.single("image"), async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const expense = await Expense.create(
      buildExpensePayload({
        body: req.body,
        file: req.file,
        user,
        userId: req.user.id,
      })
    );

    res.json(withPaidByFallback(expense));
  } catch (err) {
    console.log(err);
    res.status(500).json({ msg: "Create error" });
  }
});

router.get("/:roomId", auth, async (req, res) => {
  try {
    const expenses = await Expense.find({
      roomId: req.params.roomId,
    });

    res.json(await enrichExpensesWithUserDetails(expenses));
  } catch (err) {
    res.status(500).json({ msg: "Fetch error" });
  }
});

router.get("/", auth, async (req, res) => {
  try {
    let expenses;

    if (req.user.role === "admin") {
      expenses = await Expense.find();
    } else {
      expenses = await Expense.find({
        userId: req.user.id,
      });
    }

    res.json(await enrichExpensesWithUserDetails(expenses));
  } catch (err) {
    res.status(500).json({ msg: "Fetch error" });
  }
});

router.put("/:id", auth, upload.single("image"), async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const updateData = buildExpensePayload({
      body: req.body,
      file: req.file,
      user,
      userId: req.user.id,
      isUpdate: true,
    });
    const updated = await Expense.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    });

    res.json(withPaidByFallback(updated));
  } catch (err) {
    console.log(err);
    res.status(500).json({ msg: "Update error" });
  }
});

router.put("/status/:id", auth, async (req, res) => {
  try {
    const updateData = {};

    if (typeof req.body.status === "string") {
      updateData.status = req.body.status;
    }

    if (typeof req.body.settlementStatus === "string") {
      updateData.settlementStatus = req.body.settlementStatus;
    }

    const expense = await Expense.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    res.json(withPaidByFallback(expense));
  } catch (err) {
    console.log(err);
    res.status(500).json({ msg: "Status error" });
  }
});

router.delete("/:id", auth, async (req, res) => {
  try {
    await Expense.findByIdAndDelete(req.params.id);
    res.json({ msg: "Deleted" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ msg: "Delete error" });
  }
});

module.exports = router;
