import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import Home from "./routes/Home";
import GamePage from "./routes/GamePage";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="/opening" element={<GamePage modeId="opening" />} />
        <Route path="/ending" element={<GamePage modeId="ending" />} />
        <Route path="/hard-opening" element={<GamePage modeId="hardOpening" />} />
        <Route path="/hard-ending" element={<GamePage modeId="hardEnding" />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
