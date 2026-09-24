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

// 端口 = 一台电脑上的"门牌号"，用来区分不同程序。1024 以下是系统保留端口（80 是 HTTP 默认），
// 所以开发通常用 3000/3001 这类高位端口；抽成常量便于只改一处。
const PORT = 3001;

// 启动监听。第二个参数是"启动完成后"的回调，在这里打印日志最稳妥：确保服务器真的起来了。
// 此后进程不会退出（终端看似"卡住"是正常现象，Ctrl + C 才结束）。
// 没有匹配到任何路由的路径，Express 会自动返回 404，无需我们自己写。
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
