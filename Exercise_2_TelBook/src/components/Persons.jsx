const Persons = ({ persons, handleDelete }) => {
  return (
    <div>
      {persons.map((person) => {
        return (
          <div key={person.id}>
            <p>
              {person.name}: {person.number}
              <button onClick={() => handleDelete(person.id)}>Delete</button>
            </p>
          </div>
        );
      })}
    </div>
  );
};

export default Persons;
