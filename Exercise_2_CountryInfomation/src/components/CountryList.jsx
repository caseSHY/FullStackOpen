const CountryList = ({ countries, search }) => {
  const filteredCountries = countries.filter((country) =>
    country.name.common.toLowerCase().includes(search.toLowerCase()),
  );
  if (!filteredCountries || filteredCountries.length === 0) {
    return (
      <div>
        <p>No countries found</p>
      </div>
    );
  }
  if (filteredCountries.length > 10) {
    return (
      <div>
        <p>Too many matches found</p>
      </div>
    );
  }
  if (filteredCountries.length === 1) {
    return (
      <div>
        {/* 匹配结果恰好只剩 1 个国家 → 直接展示该国详细信息 */}
        {/* name.common：国家的通用英文名称，如 China */}
        <p>{filteredCountries[0].name.common}</p>
        {/* capital：首都。注意 API 返回的是数组（如 ["Beijing"]），
            React 渲染数组时会把元素直接拼接，多首都的国家建议写 capital.join(", ") */}
        <p>首都: {filteredCountries[0].capital}</p>
        {/* population：人口数量（数字类型） */}
        <p>人口: {filteredCountries[0].population}</p>
        {/* region：所属大洲/地区，如 Asia */}
        <p>地区: {filteredCountries[0].region}</p>
        {/* languages 是对象，形如 { zho: "Chinese", ... }：
            先 Object.values 取出语言名数组，再用 join(", ") 拼成逗号分隔的字符串 */}
        <p>语言: {Object.values(filteredCountries[0].languages).join(", ")}</p>
        {/* currencies 是对象套对象：{ CNY: { name: "Chinese yuan", symbol: "¥" } }
            先 Object.values 得到对象数组，再 map 取出每个货币的 name，最后拼接成字符串 */}
        <p>
          货币:{" "}
          {Object.values(filteredCountries[0].currencies)
            .map((currency) => currency.name)
            .join(", ")}
        </p>
      </div>
    );
  }
  return (
    <div>
      {filteredCountries.map((country) => (
        <div key={country.cca2}>
          <p>{country.name.common}</p>
        </div>
      ))}
    </div>
  );
};

export default CountryList;
