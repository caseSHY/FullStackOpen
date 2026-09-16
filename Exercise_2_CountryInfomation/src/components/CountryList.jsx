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
