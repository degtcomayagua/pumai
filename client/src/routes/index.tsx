import { createFileRoute, useNavigate } from "@tanstack/react-router";
import logo from "../logo.svg";

import { Layout, Button, Menu } from "antd";
const { Header, Sider, Content, Footer } = Layout;

import { MessageCirclePlus } from "lucide-react";

import StatusFeature from "../features/status";

import GeneralLayout from "../layouts/User";

export const Route = createFileRoute("/")({
  component: Page,
});

function Page() {
  const navigate = useNavigate();

  return (
    <>
      <Header
        className="px-4 flex items-center justify-between bg-white"
        style={{ paddingInline: 16 }}
      >
        <h1 className="text-lg font-semibold text-white">PumAI</h1>
      </Header>

      {/* HERO */}
      <div className="relative h-[70vh] flex flex-col items-center justify-center bg-[#253a69] text-white overflow-hidden">
        <div className="z-20 flex flex-col items-center justify-center">
          <img src="/assets/img/puma.png" className="w-64" alt="" />
          <h1 className="text-[100px] font-bold mb-4 text-white">
            Pum
            <span className="inline-block bg-linear-to-br bg-[linear-gradient(90deg,#00f5ff_0%,#0084ff_25%,#7b2ff7_50%,#ff00d4_75%,#00f5ff_100%)] bg-[length:300%_300%] bg-clip-text text-transparent animate-gradient font-mono">
              AI
            </span>
          </h1>

          <div className="flex items-center justify-center z-20">
            <Button
              type="primary"
              size="large"
              icon={<MessageCirclePlus />}
              onClick={() => navigate({ to: "/chat" })}
            >
              Iniciar
            </Button>
          </div>
        </div>

        <div className="z-10">
          <img
            src="/assets/img/sol-cut.png"
            className="opacity-5 grayscale invert absolute z-10 top-0 left-0 w-full h-full object-cover"
            alt=""
          />
        </div>

        <div className="absolute bottom-10 left-10 w-1/4 md:w-1/12">
          <img src="/assets/img/sellos.png" alt="Sellos" />
        </div>

        <div className="absolute bottom-10 right-10 w-1/4 md:w-1/12">
          <img
            src="/assets/img/nuevahistoria.png"
            className="w-64"
            alt="Nueva Historia"
          />
        </div>
      </div>

      <Footer>Creado con ❤️ por Fernando Rivera</Footer>
    </>
  );
}
