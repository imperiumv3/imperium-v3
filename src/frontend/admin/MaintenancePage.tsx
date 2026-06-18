import "./admin.css";

export function MaintenancePage({ message, expectedReturn }: { message: string; expectedReturn: string | null }) {
  return (
    <div className="maint-page">
      <div className="maint-card">
        <h1>System Under Maintenance</h1>
        <p>{message}</p>
        {expectedReturn && (
          <p className="maint-eta">Expected return: {new Date(expectedReturn).toLocaleString()}</p>
        )}
      </div>
    </div>
  );
}
