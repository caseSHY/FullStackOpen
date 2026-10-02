// ① 加载 .env 到 process.env（必须在最顶行，后面才能读到 MONGODB_URI / PORT）
require("dotenv").config();

const express = require("express");
const path = require("path"); // Node 内置路径模块：定位 dist 目录用
const morgan = require("morgan"); // HTTP 请求日志
const mongoose = require("mongoose"); // MongoDB ODM：JS 对象 ↔ 数据库集合
const Person = require("./models/person"); // 共享 Person 模型

const app = express();

// ---------- 中间件（按注册顺序自上而下执行） ----------
// 把 JSON 请求体解析成 JS 对象挂到 request.body；缺了它 POST 的 body 是 undefined
app.use(express.json());
// morgan 函数格式日志：手动拼接各字段，padEnd/padStart 对齐列；
// 数字字段必须先 String()/Number() 转换——对齐方法是 String 专属，数字上调用会崩
app.use(
  morgan((tokens, request, response) => {
    return [
      (tokens.method(request, response) || "-").padEnd(7),
      (tokens.url(request, response) || "-").padEnd(16),
      (tokens.status(request, response) || " ").padEnd(4),
      String(tokens.res(request, response, "content-length") ?? "N/A").padStart(
        6,
      ),
      "-",
      Number(tokens["response-time"](request, response) ?? 0)
        .toFixed(3)
        .padStart(12),
      "ms",
      "  ",
      request.body ? JSON.stringify(request.body) : "N/A",
    ].join(" ");
  }),
);

// ---------- 连接数据库 ----------
// 【与 mongo.js 的本质区别】index.js 是常驻服务器：启动时连接一次，
// 永远不调用 connection.close() —— 事件循环必须保持，否则进程退出
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("connected to MongoDB"))
  .catch((error) => console.log("error connecting to MongoDB:", error.message));

// ---------- 路由（全部变为异步：数据库操作返回 Promise） ----------
app.get("/info", (request, response) => {
  // 条数来自数据库：countDocuments 是异步操作，响应必须在 then 里发
  Person.countDocuments({}).then((count) => {
    response.send(`Phonebook has info for ${count} people${new Date()}`);
  });
});

app.get("/api/persons", (request, response) => {
  Person.find({}).then((persons) => {
    response.json(persons); // toJSON 配置保证返回干净的 {id, name, number}
  });
});

app.get("/api/persons/:id", (request, response) => {
  Person.findById(request.params.id)
    .then((person) => {
      if (person) {
        response.json(person);
      } else {
        response.status(404).end(); // id 格式合法但不存在
      }
    })
    .catch((error) => {
      // id 不是合法 ObjectId 格式 → 数据库直接抛 CastError，转成 400
      if (error.name === "CastError") {
        return response.status(400).json({ error: "malformatted id" });
      }
      response.status(500).json({ error: "internal server error" });
    });
});

app.delete("/api/persons/:id", (request, response) => {
  Person.findByIdAndDelete(request.params.id)
    .then((result) => {
      // 删除语义：result 非空 = 删到了 → 204；null = id 不存在 → 404
      response.status(result ? 204 : 404).end();
    })
    .catch((error) => {
      if (error.name === "CastError") {
        return response.status(400).json({ error: "malformatted id" });
      }
      response.status(500).json({ error: "internal server error" });
    });
});

app.post("/api/persons", (request, response) => {
  const body = request.body;

  if (!body) {
    // 空请求体（如请求头缺 Content-Type）：先挡住，避免对 undefined 取属性
    return response.status(400).json({ error: "content missing" });
  }

  const person = new Person({
    name: body.name,
    number: body.number,
  });

  person
    .save()
    .then((saved) => {
      response.json(saved);
    })
    .catch((error) => {
      // 校验失败（ValidationError）、重名（11000）统一转成 400
      if (error.name === "ValidationError") {
        return response.status(400).json({ error: error.message });
      }
      if (error.code === 11000) {
        return response.status(400).json({ error: "name must be unique" });
      }
      response.status(500).json({ error: "internal server error" });
    });
});

// 未知 API 端点：只接管 /api 下的未匹配请求（放在所有 API 路由之后）
app.use("/api", (request, response) => {
  response.status(404).json({ error: "unknown endpoint" });
});

// ---------- 前端生产构建托管（3.11） ----------
// express.static：按 URL 路径在 dist 里找文件（/ → index.html，/assets/... → 对应文件）
const distDir = path.join(__dirname, "dist"); // __dirname 锚定文件自身位置，与启动目录无关
app.use(express.static(distDir));
// SPA 回退：剩余未命中的请求一律返回 index.html，交给前端路由（必须在 API 路由之后）
app.use((_request, response) => {
  response.sendFile(path.join(distDir, "index.html"));
});

// ---------- 全局错误处理中间件 ----------
// 4 参数签名 (error, req, res, next) 是 Express 识别"错误处理器"的标志：
// 任何路由 next(error) 或抛出的异常都会流到这里（路由内已 catch 的不会到这）
app.use((error, request, response, next) => {
  console.error(error.message);

  if (error.name === "CastError") {
    return response.status(400).json({ error: "malformatted id" });
  }
  if (error.name === "ValidationError") {
    return response.status(400).json({ error: error.message });
  }

  next(error);
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
