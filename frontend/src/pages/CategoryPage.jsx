import Inbox from "./Inbox";

export default function CategoryPage({ category }) {
  return <Inbox title={category} filter={{ category }} />;
}
