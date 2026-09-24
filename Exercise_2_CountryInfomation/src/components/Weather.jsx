/**
 * ============================================================================
 *  Weather.jsx —— 天气展示组件（视图层）
 * ============================================================================
 *
 * 【这个文件是干什么的】
 * 接收一个国家对象 → 调用 weather.js 拿天气 → 把结果显示成几行文字。
 * 它自己**不发请求**，只负责"什么时候发"和"怎么显示"。
 *
 * 【在组件树中的位置】
 *   App
 *    └─ CountryList          （国家列表 / 详情）
 *         └─ Weather  ←—— 本组件，只在"详情分支"里被渲染
 *
 * 【数据来源链路】
 *   REST Countries（国家数据，含首都坐标）
 *        ↓ country 对象通过 props 传入
 *   Weather.jsx
 *        ↓ 调用 weatherService.getCurrentByCountry(country)
 *   Open-Meteo（天气数据）
 *        ↓
 *   渲染到页面
 */
import { useState, useEffect } from "react";
import weatherService from "../services/weather.js";

/**
 * ----------------------------------------------------------------------------
 * 组件定义
 * ----------------------------------------------------------------------------
 * 【props】country：单个国家对象（来自 REST Countries），例如：
 * {
 *   cca2: "CN",
 *   name: { common: "China" },
 *   capital: ["Beijing"],                    // 首都，注意是数组
 *   capitalInfo: { latlng: [39.92, 116.38] } // 首都坐标，用于查天气
 * }
 */
const Weather = ({ country }) => {
  /**
   * --------------------------------------------------------------------------
   * state 1：weather —— 天气数据本身
   * --------------------------------------------------------------------------
   * 初值 null：还没有数据时为 null（此时页面显示"加载天气中…"）
   * 成功后保存 weather.js 返回的扁平对象：
   *   { temperature, windSpeed, humidity, weatherCode, units }
   */
  const [weather, setWeather] = useState(null);

  /**
   * --------------------------------------------------------------------------
   * state 2：status —— 请求处于什么阶段
   * --------------------------------------------------------------------------
   * 四个取值：
   *   "loading" 请求中（也是初始值）
   *   "done"    成功拿到数据
   *   "none"    该国没有坐标，无法查询
   *   "error"   请求失败（网络问题 / 接口异常）
   *
   * 为什么需要它，而不是只看 weather 是否为 null？
   *   因为 null 既可能表示"还在加载"，也可能表示"查不到数据"，
   *   用独立状态才能区分这两种情况，给用户准确提示。
   *
   * 【重要】为什么 effect 里不再写 setStatus("loading")？
   *   在 useEffect 中同步调用 setState 会被 ESLint 规则
   *   react-hooks/set-state-in-effect 判定为违规（会多触发一次渲染）。
   *   正确做法：在父组件用 key={country.cca2} 让本组件在切换国家时
   *   **重新挂载**，state 自然回到初始值 "loading"。
   *   见 CountryList.jsx 中的 <Weather key={...} country={...} />
   */
  const [status, setStatus] = useState("loading");

  /**
   * --------------------------------------------------------------------------
   * useEffect：组件挂载后发起请求
   * --------------------------------------------------------------------------
   * 【依赖数组】[country.cca2]
   *   cca2 是国家唯一代码（如 "CN"）。它变化时 effect 重新执行。
   *   配合父组件的 key，切换国家时实际上是"旧组件卸载 + 新组件挂载"。
   *
   * 【ignore 变量的作用：防竞态】
   *   场景：请求 A 还没回来，用户又切到国家 B。
   *   如果 A 后返回并写入 state，页面就会显示 A 的天气配 B 的名字。
   *   做法：cleanup 时把 ignore 置为 true，回调里先判断 ignore 再写 state。
   *
   * 【cleanup 函数】return () => { ignore = true }
   *   组件卸载或依赖变化前执行，用于取消/忽略未完成的请求。
   */
  useEffect(() => {
    let ignore = false;

    weatherService
      .getCurrentByCountry(country) // 返回 Promise
      .then((data) => {
        if (ignore) return; // 已经切换了国家，丢弃这个过期结果

        if (data) {
          // 有数据：保存天气 + 标记成功
          setWeather(data);
          setStatus("done");
        } else {
          // data 为 null：该国既没有 capitalInfo.latlng 也没有 latlng
          setStatus("none");
        }
      })
      .catch(() => {
        // Promise 被 reject（网络失败 / axios 抛错）
        if (!ignore) setStatus("error");
      });

    return () => {
      ignore = true;
    };
  }, [country.cca2]);

  /**
   * --------------------------------------------------------------------------
   * 渲染分支：根据 status 决定显示什么（提前 return，避免深层嵌套）
   * --------------------------------------------------------------------------
   */
  if (status === "loading") return <p>加载天气中…</p>;
  if (status === "none") return <p>暂无天气数据（该国缺少坐标信息）</p>;
  if (status === "error") return <p>天气加载失败</p>;

  /**
   * --------------------------------------------------------------------------
   * 成功分支：正常渲染天气
   * --------------------------------------------------------------------------
   */
  return (
    <div>
      {/*
        标题：显示"哪个城市的天气"
        country.capital 是数组（如 ["Beijing"]），取第 0 项；
        ?. 可选链：capital 不存在时不报错，返回 undefined；
        ?? 兜底：没有首都信息就退回显示国家名。
      */}
      <h3>Weather in {country.capital?.[0] ?? country.name.common}</h3>

      {/*
        温度：weather.temperature 是数字（如 21.5）
        weather.units.temperature_2m 是单位字符串（"°C"）
        单位由接口 current_units 提供，不写死，换成华氏单位也能正确显示
      */}
      <p>
        温度: {weather.temperature} {weather.units.temperature_2m}
      </p>

      {/* 风速：单位通常是 km/h */}
      <p>
        风速: {weather.windSpeed} {weather.units.wind_speed_10m}
      </p>

      {/* 湿度：单位是 % */}
      <p>
        湿度: {weather.humidity} {weather.units.relative_humidity_2m}
      </p>

      {/*
        weather_code 是数字（如 61），通过 describeWeather 转成中文（"小雨"）
        对照表定义在 services/weather.js 中
      */}
      <p>天气: {weatherService.describeWeather(weather.weatherCode)}</p>
    </div>
  );
};

export default Weather;
