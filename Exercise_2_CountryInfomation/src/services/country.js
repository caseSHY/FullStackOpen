/**
 * ============================================================================
 *  country.js —— 国家数据服务层（services 层）
 * ============================================================================
 *
 * 【这个文件是干什么的】
 * 负责跟 REST Countries 接口通信，给组件提供国家数据。
 * 与同层的 weather.js 结构保持一致（都是"发请求 + 取出 response.data"）。
 *
 * 【数据来源】
 * https://studies.cs.helsinki.fi/restcountries/api
 *  - 赫尔辛基大学课程用的镜像（原始站点是 restcountries.com）
 *  - 两个端点：
 *      GET /all          → 所有国家
 *      GET /name/{name}  → 按名称模糊搜索
 *  - 免密钥，返回 JSON
 *
 * 【与 weather.js 的关键差异：参数位置不同】
 *   weather.js：参数在「查询串」里 → ?latitude=…&current=… → 用 axios 的 params
 *   country.js：参数在「URL 路径」里 → /name/China     → 只能用模板字符串拼路径
 *   因为 params 只能生成 ? 后面的内容，拼不出路径段，所以这里不能用 params。
 *
 * 【输出】两个函数都返回 Promise<国家对象数组>
 *   [ { cca2: "CN", name: { common: "China" }, capital: ["Beijing"], ... }, ... ]
 */
import axios from "axios";

/**
 * ----------------------------------------------------------------------------
 * 1. 用 axios.create 建一个"专属客户端"
 * ----------------------------------------------------------------------------
 * 好处：baseURL 只写一次，后面每个请求只写路径（"/all"、"/name/xxx"），
 *      不用在每个函数里重复 `${baseUrl}`。
 *
 * 常见可配置项（本项目暂时只用到 baseURL）：
 *   baseURL   —— 统一前缀，请求时只写相对路径
 *   timeout   —— 超时毫秒数
 *   headers   —— 统一请求头
 *
 * 注意：axios.create 返回的是一个「新的 axios 实例」，用法与 axios 本身完全一致。
 */
const api = axios.create({
  baseURL: "https://studies.cs.helsinki.fi/restcountries/api",
});

/**
 * ----------------------------------------------------------------------------
 * 2. getAll —— 获取所有国家
 * ----------------------------------------------------------------------------
 * 【请求】GET /all
 *       完整地址：https://studies.cs.helsinki.fi/restcountries/api/all
 *
 * 【输出】Promise<国家对象数组>（约 250 个国家）
 *
 * 【调用方】App.jsx 的 useEffect：启动时拉一次，之后靠前端过滤，不再重复请求
 *
 * 【注意】这里没有 params，因为 /all 不需要任何查询参数
 */
const getAll = () => {
  const request = api.get("/all");
  // axios 把响应体放在 response.data，这里直接把它交给调用方
  return request.then((response) => response.data);
};

/**
 * ----------------------------------------------------------------------------
 * 3. getOne —— 按名称搜索国家
 * ----------------------------------------------------------------------------
 * 【请求】GET /name/{countryName}
 *       完整地址：https://studies.cs.helsinki.fi/restcountries/api/name/China
 *
 * 【为什么要 encodeURIComponent】
 * countryName 来自用户输入或国家数据，可能包含空格和特殊字符：
 *   "United States"      → 含空格
 *   "Côte d'Ivoire"      → 含撇号
 *   "Congo, Dem. Rep."   → 含逗号
 *   "Curaçao"            → 含非 ASCII 字符
 * 直接拼进 URL 会产生非法地址或被接口误解，encodeURIComponent 会转成合法形式
 * （空格 → %20，撇号等也会转义）。
 *
 * 【为什么不用 params】
 * countryName 是 URL 的「路径段」，不是查询参数；
 * axios 的 params 只能生成 ?key=value，拼不出 /name/xxx 这种结构。
 *
 * 【将来若需要查询参数，这样写】
 *   api.get(`/name/${encodeURIComponent(countryName)}`, {
 *     params: { fullText: true },   // → /name/xxx?fullText=true
 *   });
 *
 * 【输出】Promise<国家对象数组>
 *   注意：即使只匹配到一个国家，接口也返回「数组」，不是单个对象。
 */
const getOne = (countryName) => {
  const path = `/name/${encodeURIComponent(countryName)}`;
  const request = api.get(path);
  return request.then((response) => response.data);
};

/**
 * ----------------------------------------------------------------------------
 * 4. 对外导出（与 weather.js 风格一致：默认导出一个对象）
 * ----------------------------------------------------------------------------
 * 使用方：import countryService from "./services/country.js";
 *         countryService.getAll()
 */
export default { getAll, getOne };
