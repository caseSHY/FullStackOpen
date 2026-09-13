const Header = ({ name }) => {
  return <h1>{name}</h1>;
};
const Content = ({ part }) => {
  return (
    <p>
      {part.name} {part.exercises}
    </p>
  );
};

const Contents = ({ parts }) => {
  // console.log(parts);
  return (
    <div>
      {parts.map((part) => (
        <Content key={part.id} part={part} />
      ))}
    </div>
  );
};
const Total = ({ exercises }) => {
  return <b>Total of exercises {exercises}</b>;
};

const Course = ({ course }) => {
  return (
    <div>
      <Header name={course.name} />
      <Contents parts={course.parts} />
      <Total
        exercises={course.parts.reduce((sum, part) => sum + part.exercises, 0)}
      />
    </div>
  );
};

export default Course;
