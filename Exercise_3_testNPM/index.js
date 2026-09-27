// ============================================================================
//  index.js —— 用 Express 框架搭一个最简单的接口服务器
// ============================================================================
//  【跑起来】node index.js（或 npm start）
//  【试一试】浏览器打开 http://localhost:3001           → 看到 Hello World!
//           浏览器打开 http://localhost:3001/api/notes  → 看到三条笔记的 JSON
//           浏览器打开 http://localhost:3001/abc        → Express 自动返回 404
//  【停  止】终端按 Ctrl + C        【改代码后】必须重启才生效
//
//  【整体思路：三步】
//    1. require('express')      → 引入第三方框架（已用 npm install express 装好）
//    2. app.get(路径, 回调)      → 注册路由：声明"访问某路径时该做什么"
//    3. app.listen(端口)         → 启动监听，进程持续运行等待请求
//
//  【Express 带来了什么：控制反转】
//    原生 http 写法里，你是主人：自己判断 URL、自己写响应头、自己 JSON.stringify、自己 end()。
//    用 Express 后，**Express 是主人**：请求进来后由它解析 URL、匹配方法和路径、
//    找到你登记的那个函数去调用、再帮你处理序列化和错误处理。
//    你从"调用者"变成"被调用者" —— 这正是框架与库的根本区别。
//
//  【本文件用到的两个响应方法】
//    response.send(内容)  → 自动设置 Content-Type（字符串默认为 text/html），然后结束响应
//    response.json(对象)  → 自动 JSON.stringify + 设置 application/json，然后结束响应
//    都不需要再手写 writeHead / end —— Express 全包了。
// ============================================================================

const express = require("express");

// express() 是一个函数调用，返回"应用实例"，习惯上命名为 app。
// 这个 app 就是整个服务器：路由注册在它身上，最后由它启动监听。
const app = express();

// 注册"中间件"（middleware）：每个请求进来都会先经过它，再流入后面的路由。
// express.json() 的作用是：当请求头声明 Content-Type: application/json 时，
// 把请求体里的 JSON 字符串解析成 JS 对象，挂到 request.body 上供路由使用。
// 没有这一行，POST 请求发来的 JSON 到了路由里就是 undefined，什么都取不到。
app.use(express.json());
// 模拟的"数据源"。真实项目里数据存在数据库中，这里先用内存里的数组代替；
// 因为是内存数据，服务器一重启就还原，增删改只在本次运行期间有效。
// 用 let 而非 const：预留后续增删改的可能（const 只禁止重新赋值，不禁止修改数组内容）。
// 每条笔记含 id、content、important 三个字段；id 用字符串，与前端 JSON / 数据库主键习惯一致。
let notes = [
  {
    id: "1",
    content: "HTML is easy",
    important: true,
  },
  {
    id: "2",
    content: "Browser can execute only JavaScript",
    important: false,
  },
  {
    id: "3",
    content: "GET and POST are the most important methods of HTTP protocol",
    important: true,
  },
];

// 注册路由：GET /
// 意思是"当收到【GET 方法 + 路径 /】的请求时，执行这个回调"。
// 回调的两个参数由 Express 传入：request（请求，可读查询参数、请求头、请求体）
//                                response（响应，往里面写要返回的内容）。
// 此刻只是"登记"，请求真正到来时才会执行。
app.get("/", (request, response) => {
  response.send("<h1>Hello World!</h1>");
});

// 注册路由：GET /api/notes
// response.json(notes) 做了三件事：把数组转成 JSON 字符串、设置 Content-Type: application/json、结束响应。
// 对比原生写法（writeHead + JSON.stringify + end）三行变一行。
// 注意：路径 / 和 /api/notes 互不干扰，Express 按注册顺序逐个匹配，命中第一个符合的就停。
app.get("/api/notes", (request, response) => {
  response.json(notes);
});

// 注册路由：GET /api/notes/:id —— 查询单条笔记。
// 路径中的 :id 是"路由参数"占位符：访问 /api/notes/2 时 Express 自动匹配，
// 并把 "2" 解析进 request.params 对象（id 取出来是字符串，因为 URL 里没有类型概念）。
// 然后用 notes.find 配合严格相等 === 逐条比对，找出第一条 id 相同的笔记：
// 找到就返回该笔记的 JSON；找不到则手动返回 404 —— 框架不会替你判断"该不该 404"，
// 默认情况下响应状态码一律是 200，必须自己区分这两种情况。
app.get("/api/notes/:id", (request, response) => {
  const id = request.params.id;
  const note = notes.find((note) => note.id === id);
  if (note) {
    response.json(note);
  } else {
    response.status(404).end("Note not found");
  }
});

// 注册路由：DELETE /api/notes/:id —— 删除单条笔记。
// :id 的取法与上面的 GET 完全一样。删除用 filter 实现：生成一个"不含该 id"的新数组，
// 让 notes 重新指向它 —— 原数组并没有被就地修改，这与 React 等前端库"不可变数据"的习惯一致。
// 即使 id 根本不存在，filter 也只是原样生成一个等价的新数组，因此这里统一返回 204 No Content，
// 表示"删除成功、无响应正文"；204 不能携带正文，所以用 end() 而不是 send()/json()。
app.delete("/api/notes/:id", (request, response) => {
  const id = request.params.id;
  notes = notes.filter((note) => note.id !== id);
  response.status(204).end();
});

// 生成新 id 的辅助函数：取当前最大 id 加 1，再转回字符串。
// Math.max(...notes.map(n => Number(n.id))) 这行代码中到底发生了什么？
// notes.map(n => Number(n.id)) 新建了一个包含所有笔记 id 的、数字形式的数组；
// Math.max 返回传递给它的所有数字中的最大值。然而 notes.map(...) 的结果是一个数组，
// 不能直接作为一个参数传给 Math.max，数组要通过"三点"展开语法 ... 转换为一个个数字。
// 又因为 id 平时以字符串形式存储，所以先用 Number() 显式转成数字再比较大小。
// 三元表达式是空数组保护：Math.max() 不带任何参数会返回 -Infinity，
// notes 为空时直接取 0，否则第一条新笔记的 id 会变成 "-Infinity"。
const generateId = () => {
  const maxId =
    notes.length > 0 ? Math.max(...notes.map((n) => Number(n.id))) : 0;
  return String(maxId + 1);
};

// 注册路由：POST /api/notes —— 新增一条笔记。
// 请求体已经由 express.json() 中间件解析成 JS 对象，就放在 request.body 里。
// 先做数据校验：content 缺失或为空时直接返回 400 Bad Request 并附上错误说明；
// 这里的 return 一举两得 —— 结束响应的同时提前退出函数，避免继续往下执行。
// 校验通过后构造新对象存入：important 没传时用 || 兜底为 false；
// id 由服务端的 generateId() 生成而不信任客户端 —— 客户端只提交内容和重要性。
// notes.concat(note) 返回"追加了新元素的新数组"，依旧不改原数组；
// 最后把新建的 note 用 JSON 返回：前端拿到的响应体就是这条保存成功的笔记，
// 可以直接拿来更新界面上的列表，不必再发一次 GET 请求。
app.post("/api/notes", (request, response) => {
  const body = request.body;

  if (!body.content) {
    return response.status(400).json({
      error: "content missing",
    });
  }

  const note = {
    content: body.content,
    important: body.important || false,
    id: generateId(),
  };

  notes = notes.concat(note);

  response.json(note);
});
// 端口 = 一台电脑上的"门牌号"，用来区分不同程序。1024 以下是系统保留端口（80 是 HTTP 默认），
// 所以开发通常用 3000/3001 这类高位端口；抽成常量便于只改一处。
const PORT = 3001;

// 启动监听。第二个参数是"启动完成后"的回调，在这里打印日志最稳妥：确保服务器真的起来了。
// 此后进程不会退出（终端看似"卡住"是正常现象，Ctrl + C 才结束）。
// 没有匹配到任何路由的路径，Express 会自动返回 404，无需我们自己写。
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
