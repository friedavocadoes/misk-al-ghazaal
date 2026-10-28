export function contactMessage(body: Record<string, unknown>) {
  const fields = [
    "topic",
    "name",
    "email",
    "phone",
    "company",
    "category",
    "quantity",
    "date",
    "product",
    "title",
    "message",
    "orderNo",
    "complaintType",
  ] as const;
  const data = Object.fromEntries(
    fields.map((key) => [
      key,
      typeof body[key] === "string" ? body[key].trim() : "",
    ]),
  ) as Record<(typeof fields)[number], string>;
  if (
    !["meeting", "review", "complaint"].includes(data.topic) ||
    !data.name ||
    data.name.length > 120 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email) ||
    data.email.length > 254 ||
    !data.message ||
    data.message.length > 5000
  )
    throw new Error("Please check your name, email and message.");
  for (const key of fields)
    if (key !== "message" && data[key].length > 254)
      throw new Error("One of the fields is too long.");
  if (data.topic === "meeting" && !data.category)
    throw new Error("Choose a product category.");
  if (
    data.topic === "review" &&
    (!data.product ||
      !Number.isInteger(body.rating) ||
      Number(body.rating) < 1 ||
      Number(body.rating) > 5)
  )
    throw new Error("Choose a product and rating.");
  if (data.topic === "complaint" && !data.complaintType)
    throw new Error("Choose an issue type.");
  const relevant = new Set(["topic","name","email","phone","message",...(data.topic === "meeting" ? ["company","category","quantity","date"] : data.topic === "review" ? ["product","title"] : ["orderNo","complaintType"])]);
  for (const key of fields) if (!relevant.has(key)) data[key] = "";
  return {
    ...data,
    email: data.email.toLowerCase(),
    rating: data.topic === "review" ? Number(body.rating) : null,
  };
}
