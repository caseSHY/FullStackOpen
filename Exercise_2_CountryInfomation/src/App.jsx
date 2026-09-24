import { useState, useEffect } from "react";
import countryService from "./services/country.js";
import CountryList from "./components/CountryList.jsx";

const App = () => {
  const [countries, setCountries] = useState([]);
  const [search, setSearch] = useState("");
  const handleChange = (event) => {
    setSearch(event.target.value);
  };

  useEffect(() => {
    countryService.getAll().then((countries) => setCountries(countries));
  }, []);

  return (
    <div>
      <h1>Country Information</h1>
      <p>Welcome to the Country Information App!</p>
      <p>Search for a country:</p>
      <input type="text" value={search} onChange={handleChange} />
      <CountryList
        countries={countries}
        search={search}
        setSearch={setSearch}
      />
    </div>
  );
};

export default App;
