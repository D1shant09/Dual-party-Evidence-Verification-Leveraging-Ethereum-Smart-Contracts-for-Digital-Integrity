import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./Home";
import Provider from "./components/provider/Provider";
import Reciepient from "./components/reciepient/Reciepient";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />}>
          <Route index element={<></>} /> {/* Default Page */}
          <Route path="provider" element={<Provider/>} />
          <Route path="reciepient" element={<Reciepient/>} />
          <Route path="viewer" element={<>viewer</>} />
          <Route path="*" element={<>undefined route</>} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
