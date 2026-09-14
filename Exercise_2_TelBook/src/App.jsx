import { useState, useEffect } from "react";
import Filter from "./components/Filter";
import PersonForm from "./components/PersonForm";
import Persons from "./components/Persons";
import Notification from "./components/Notification";
import personService from "./services/persons";

const App = () => {
  const [persons, setPersons] = useState([]);
  const [newName, setNewName] = useState("");
  const [newNumber, setNewNumber] = useState("");
  const [filter, setFilter] = useState("");
  const [message, setMessage] = useState(null);

  // 首次渲染时从服务器（json-server 读取的 db.json）获取数据
  useEffect(() => {
    personService.getAll().then((initialPersons) => setPersons(initialPersons));
  }, []);

  // 通知显示 5 秒后自动消失
  useEffect(() => {
    if (!message) return;

    const timer = setTimeout(() => setMessage(null), 5000);
    return () => clearTimeout(timer);
  }, [message]);

  const handleSubmit = (event) => {
    event.preventDefault(); // "别刷新页面！"
    console.log("提交了名字：", newName);
    console.log("提交了号码：", newNumber);

    // 名字已存在 → 询问是否用新号码替换旧号码
    const existing = persons.find((person) => person.name === newName);
    if (existing) {
      const confirmed = window.confirm(
        `${newName} 已在电话簿中，是否用新号码替换？`,
      );
      if (!confirmed) return; // 取消：保留输入框里的内容

      personService
        .update(existing.id, { name: newName, number: newNumber })
        .then((updated) => {
          setPersons(
            persons.map((person) =>
              person.id === updated.id ? updated : person,
            ),
          );
          setNewName("");
          setNewNumber("");
          setMessage({ text: `已更新 ${updated.name} 的号码`, type: "success" });
        })
        .catch((error) => {
          const notFound = error.response?.status === 404;

          // 记录已被别的浏览器删除 → 顺手把它从本地列表里清掉
          if (notFound) {
            setPersons(persons.filter((person) => person.id !== existing.id));
          }

          setMessage({
            text: notFound
              ? `${existing.name} 已从服务器中删除，无法更新`
              : `更新 ${existing.name} 失败：${error.message}`,
            type: "error",
          });
        });
      return;
    }

    // id 由 json-server 生成，返回的对象里带有 id
    personService
      .create({ name: newName, number: newNumber })
      .then((created) => {
        setPersons(persons.concat(created));
        setMessage({ text: `已添加 ${created.name}`, type: "success" });
      })
      .catch((error) => {
        setMessage({
          text: `添加 ${newName} 失败：${error.message}`,
          type: "error",
        });
      });

    setNewName("");
    setNewNumber("");
  };

  const handleDelete = (id) => {
    const personToDelete = persons.find((person) => person.id === id);

    personService
      .remove(id)
      .then(() => {
        setPersons(persons.filter((person) => person.id !== id));
        setMessage({ text: `已删除 ${personToDelete.name}`, type: "success" });
      })
      .catch((error) => {
        const notFound = error.response?.status === 404;

        // 服务器上本来就没有了 → 本地列表也同步清掉
        if (notFound) {
          setPersons(persons.filter((person) => person.id !== id));
        }

        setMessage({
          text: notFound
            ? `${personToDelete.name} 已从服务器中删除`
            : `删除 ${personToDelete.name} 失败：${error.message}`,
          type: "error",
        });
      });
  };

  // 大小写不敏感地按名字筛选
  const personsToShow = persons.filter((person) =>
    person.name.toLowerCase().includes(filter.toLowerCase()),
  );

  return (
    <div>
      <h2>Phonebook</h2>
      <Notification message={message} />

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
      <Persons persons={personsToShow} handleDelete={handleDelete} />
    </div>
  );
};

export default App;
