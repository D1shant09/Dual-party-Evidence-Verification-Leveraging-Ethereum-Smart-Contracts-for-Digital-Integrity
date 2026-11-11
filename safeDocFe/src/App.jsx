import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./Home";
import Provider from "./components/provider/Provider";
import Reciepient from "./components/reciepient/Reciepient";
import ViewerPortal from "./components/viewer/ViewerPortal";
import AdminConsole from "./components/admin/AdminConsole";
import AuditPortal from "./components/audit/AuditPortal";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />}>
          <Route index element={<Provider />} /> {/* Default to Provider dashboard */}
          <Route path="provider" element={<Provider />} />
          <Route path="reciepient" element={<Reciepient />} />
          <Route path="viewer" element={<ViewerPortal />} />
          <Route path="admin" element={<AdminConsole />} />
          <Route path="audit" element={<AuditPortal />} />
          <Route path="*" element={<div className="p-6 text-center text-slate-500 dark:text-slate-400">Page not found</div>} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
