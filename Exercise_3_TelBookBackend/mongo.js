// mongo.js —— 命令行工具（使用共享模型）
// 用法：node mongo.js <密码占位> [姓名] [号码]
// 一次性脚本的生命周期：连接 → 操作 → close → 进程退出（与常驻的 index.js 相反）
require("dotenv").config();
const mongoose = require("mongoose");
const Person = require("./models/person"); // ← 复用模型，不再重复定义

// process.argv: [0]=node 路径, [1]=脚本路径, [2]=第一个用户参数（密码占位）
const name = process.argv[3];
const number = process.argv[4];

// 自部署本机版：连接串从 .env 读取（和 index.js 同源）
const url = process.env.MONGODB_URI;

mongoose.connect(url);

if (name && number) {
  const person = new Person({ name, number });
  person
    .save()
    .then(() => {
      console.log(`added ${name} number ${number} to phonebook`);
      mongoose.connection.close(); // close 必须在异步完成之后（练习 3.12 的核心警告）
    })
    .catch((error) => {
      // 两类可预期失败：唯一索引冲突（error.code === 11000）、格式校验失败（ValidationError）
      // 没有 catch 的话，未处理的 Promise 拒领会直接让进程崩溃并倾倒堆栈
      if (error.code === 11000) {
        console.error(`保存失败: ${name} 已存在于电话簿中`);
      } else {
        console.error("保存失败:", error.message);
      }
      mongoose.connection.close(); // 出错也要体面地关闭连接再退出
    });
} else {
  Person.find({}).then((result) => {
    console.log("phonebook:");
    result.forEach((person) => console.log(`${person.name} ${person.number}`));
    mongoose.connection.close(); // 同上
  });
}
