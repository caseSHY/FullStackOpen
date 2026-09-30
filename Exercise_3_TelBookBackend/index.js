// require("express") 返回的是 Express 模块本身，先存进变量 express；
// 再调用 express() 生成应用实例 app。两步分开写，后面才能用到 express.json() 等模块方法。
// 【曾经的 Bug】写成 const app = require("express")(); 直接链式调用生成 app，
// 但 express 模块没被保存，使用 express.json() 时抛 ReferenceError: express is not defined。
const express = require("express");
const cors = require("cors");
const crypto = require("crypto"); // Node 内置模块，无需 npm install
const morgan = require("morgan");
const app = express();

// 注册"中间件"：每个请求先经过它，再流入路由。
// express.json() 在请求头声明 Content-Type: application/json 时，把请求体解析成 JS 对象挂到 request.body 上。
// 【曾经的 Bug】少了这一行，request.body 是 undefined，POST 路由里读 body.name 抛
// "Cannot read properties of undefined (reading 'name')"，请求返回 500。
app.use(cors());
app.use(express.json());
// morgan 日志中间件：格式 = tiny 的内容 + 末尾追加请求体（"函数格式"写法）。
// 【为什么不写 morgan.token("body", ...) + 字符串格式？】morgan 1.12+ 会把每个自定义
// token 的返回值自动做防日志注入转义（escapeLogField：引号变 \" 等），日志里就会
// 显示 {\"name\":...}。改用函数格式、直接调 JSON.stringify，绕过 token 包装，
// 就能显示干净的 JSON（GET 无请求体时显示 -）。
// ⚠️ 安全提示：日志含原始请求体，生产环境务必先脱敏（GDPR）。
app.use(
  morgan((tokens, request, response) => {
    return [
      (tokens.method(request, response) || "-").padEnd(7), // 最长 DELETE=6，留 7
      (tokens.url(request, response) || "-").padEnd(16), // URL 最长路径，留余量
      (tokens.status(request, response) || " ").padEnd(4),
      (tokens.res(request, response, "content-length") || "N/A").padStart(6), // 数字右对齐
      (tokens["response-time"](request, response) || "N/A").padStart(12), // 数字右对齐
      "ms",
      "  ",
      request.body ? JSON.stringify(request.body) : "N/A",
    ].join(" ");
  }),
);

// 数据源。用 let 而非 const：删除路由里要 phonebooks = phonebooks.filter(...) 重新赋值，
// const 只允许修改数组内容、不允许重新指向，重新赋值会抛 Assignment to constant variable。
let phonebooks = [
  {
    id: "1",
    name: "Arto Hellas",
    number: "040-123456",
  },
  {
    id: "2",
    name: "Ada Lovelace",
    number: "39-44-5323523",
  },
  {
    id: "3",
    name: "Dan Abramov",
    number: "12-43-234345",
  },
  {
    id: "4",
    name: "Mary Poppendieck",
    number: "39-23-6423122",
  },
];

app.get("/info", (_request, response) => {
  const date = new Date();
  response.send(
    `<p>Phonebook has info for ${phonebooks.length} people</p><p>${date}</p>`,
  );
});

app.get("/api/persons", (_request, response) => {
  // 返回快照副本而非内部数组引用：序列化与后续修改完全隔离，不泄漏内部可变状态
  response.json([...phonebooks]);
});

app.get("/api/persons/:id", (request, response) => {
  const id = request.params.id;
  const person = phonebooks.find((person) => person.id === id);
  if (person) {
    response.json(person);
  } else {
    response.status(404).end("Person not found");
  }
});

// 注册路由：POST /api/persons —— 新增一条联系人。
// 【曾经的 Bug】报错 "Cannot read properties of undefined (reading 'name')"，返回 500。
// 原因：项目缺少 express.json() 中间件（已在文件顶部补上），请求体不会被解析，
// request.body 为 undefined，下面的 body.name 就抛 TypeError。
// 【修复】顶部加 app.use(express.json())；本段代码未动。
// 注：return 在校验失败时既结束响应又提前退出函数，避免继续往下执行。
app.post("/api/persons", (request, response) => {
  const body = request.body;
  // 边界加固分两层：
  // 1) !body：请求没带 Content-Type: application/json 头时 body 是 undefined，直接读属性会 500；
  // 2) typeof + trim：name/number 必须是"非空白字符串"——数字、对象、纯空格都拒绝。
  //    【曾经的隐患】只写 !body.name 时，传 123、{}、" " 都能通过校验，脏数据入库后
  //    重名检查等按字符串比较的逻辑会全部失真。
  if (
    !body ||
    typeof body.name !== "string" ||
    !body.name.trim() ||
    typeof body.number !== "string" ||
    !body.number.trim()
  ) {
    return response.status(400).json({
      error: "name or number missing",
    });
  }
  if (phonebooks.some((person) => person.name === body.name)) {
    return response.status(400).json({
      error: "name must be unique",
    });
  }
  const person = {
    // crypto.randomUUID()：Node 内置 UUID 生成器，碰撞概率约等于零。
    // 【曾经的隐患】Math.floor(Math.random() * 1000000) 只有 100 万种取值，
    // 数据量增大后可能生成重复 id，导致 GET/:id 返回错人、DELETE 误删多条。
    id: crypto.randomUUID(),
    name: body.name,
    number: body.number,
  };
  phonebooks.push(person);
  response.json(person);
});

// 注册路由：DELETE /api/persons/:id —— 删除单条联系人。
// 【曾经的 Bug】phonebooks 最初声明为 const，而下一行 filter 后"重新赋值"给 phonebooks，
// 运行时抛出 TypeError: Assignment to constant variable，请求返回 500。
// 原因：const 的"常量"指绑定不可变 —— 修改数组内容（push/pop）合法，
// 重新指向（phonebooks = 新数组）非法；需要重新赋值的场景必须用 let 声明。
// 【修复】把第 2 行的声明改为 let phonebooks，本行代码本身未动。
// 另：204 表示"删除成功、无响应正文"，按规范 end() 不携带参数。
app.delete("/api/persons/:id", (request, response) => {
  const id = request.params.id;
  const before = phonebooks.length;
  phonebooks = phonebooks.filter((person) => person.id !== id);
  // id 不存在时返回 404，让客户端能区分"删除成功"和"目标本来就不存在"。
  // 注：Fullstack Open 3.4 明确允许无差别 204 的写法，两种都算对；这里采用更严格的 REST 语义。
  if (phonebooks.length === before) {
    return response.status(404).end();
  }
  response.status(204).end();
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
