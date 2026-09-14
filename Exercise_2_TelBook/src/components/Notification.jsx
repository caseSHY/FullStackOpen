const Notification = ({ message }) => {
  if (!message) return null;

  const isError = message.type === "error";

  return (
    <div
      style={{
        color: isError ? "red" : "green",
        background: "#f6f6f6",
        border: `2px solid ${isError ? "red" : "green"}`,
        borderRadius: 5,
        padding: 10,
        marginBottom: 10,
        fontSize: 16,
      }}
    >
      {message.text}
    </div>
  );
};

export default Notification;
