// models/person.js —— Person 模型（index.js 与 mongo.js 共用）
const mongoose = require("mongoose");

const personSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "person name is required"], // 缺失时返回 400
    minlength: [3, "person name must be at least 3 characters long"],
    unique: true, // 数据库层唯一索引
    trim: true,
  },
  number: {
    type: String,
    required: [true, "person number is required"],
    // 校验规则（课程本意）：2-3 位数字开头紧跟横杠（区号），总位数 ≥ 8，
    // 中间允许多段横杠（如 040-1234556 / 39-23-6423122）
    // 【曾经的坑】旧规则限死后段只能 7~8 位，把课程数据 39-236423122（9 位）也拒了
    validate: {
      validator: (v) => {
        const digits = v.replace(/\D/g, ""); // 抽出所有数字字符
        return /^\d{2,3}-/.test(v) && digits.length >= 8;
      },
      message: (props) => `${props.value} is not a valid phone number`,
    },
  },
});

// 控制输出给前端的 JSON 形态：
//   virtuals: true  → 包含 id（_id 的字符串版），前端 persons.js 用 person.id 的兼容保障
//   versionKey: false → 去掉内部版本字段 __v
//   transform → 去掉 _id，对外只暴露干净的 id
personSchema.set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret) => {
    delete ret._id;
    return ret;
  },
});

module.exports = mongoose.model("Person", personSchema);
