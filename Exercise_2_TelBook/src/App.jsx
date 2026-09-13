import { useState, useEffect } from "react";
import Filter from "./components/Filter";
import PersonForm from "./components/PersonForm";
import Persons from "./components/Persons";
import personService from "./services/persons";

const App = () => {
  const [persons, setPersons] = useState([]);
  const [newName, setNewName] = useState("");
  const [newNumber, setNewNumber] = useState("");
  const [filter, setFilter] = useState("");

  // 首次渲染时从服务器（json-server 读取的 db.json）获取数据
  useEffect(() => {
    personService.getAll().then((initialPersons) => setPersons(initialPersons));
  }, []);

  const handleSubmit = (event) => {
    event.preventDefault(); // "别刷新页面！"
    console.log("提交了名字：", newName);
    console.log("提交了号码：", newNumber);
    //名字去重，重复名字使用alert提示
    if (persons.some((person) => person.name === newName)) {
      alert(`${newName} 已经存在`);
      return;
    }
    // id 由 json-server 生成，返回的对象里带有 id
    personService.create({ name: newName, number: newNumber }).then((created) => {
      setPersons(persons.concat(created));
    });
  };

  // 大小写不敏感地按名字筛选
  const personsToShow = persons.filter((person) =>
    person.name.toLowerCase().includes(filter.toLowerCase()),
  );

  return (
    <div>
      <h2>Phonebook</h2>
      <Filter
        filter={filter}
        onFilterChange={(event) => setFilter(event.target.value)}
      />

      <h2>Add a new</h2>
      <PersonForm
        newName={newName}
        newNumber={newNumber}
        onNameChange={(event) => setNewName(event.target.value)}
        onNumberChange={(event) => setNewNumber(event.target.value)}
        onSubmit={handleSubmit}
      />

      <h2>Numbers</h2>
      <Persons persons={personsToShow} />
    </div>
  );
};

export default App;
