import { Link } from "react-router-dom";

function NotFoundPage() {
  return (
    <div className="page-wrap not-found">
      <div className="panel">
        <h1>Page not found</h1>
        <Link to="/manage" className="button">
          Go to vendor setup
        </Link>
      </div>
    </div>
  );
}

export default NotFoundPage;
