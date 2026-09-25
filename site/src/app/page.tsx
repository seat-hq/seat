import { Hero } from "@/components/hero/Hero";
import { Familiar } from "@/components/sections/Familiar";
import { Questions } from "@/components/sections/Questions";
import { Primitive } from "@/components/sections/Primitive";
import { Story } from "@/components/story/Story";
import { Compare } from "@/components/sections/Compare";
import { Risk } from "@/components/sections/Risk";
import { Flows } from "@/components/sections/Flows";
import { Economics } from "@/components/sections/Economics";
import { Manifesto } from "@/components/sections/Manifesto";
import { Trust } from "@/components/sections/Trust";
import { System } from "@/components/sections/System";
import { Status } from "@/components/sections/Status";
import { Enter } from "@/components/sections/Enter";

export default function Home() {
  return (
    <>
      <Hero />
      <Familiar />
      <Questions />
      <Primitive />
      <Story />
      <Compare />
      <Risk />
      <Flows />
      <Economics />
      <Manifesto />
      <Trust />
      <System />
      <Status />
      <Enter />
    </>
  );
}
