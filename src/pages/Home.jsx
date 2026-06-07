// src/pages/Home.jsx
import React from "react";
import Hero from "../components/Hero";
import AboutAyurveda from "../components/AboutAyurveda";
import AyurvedicPrincipals from "../components/AyurvedicPrincipals";
import Features from "../components/Features";
import Services from "../components/Services";
import Testimonials from "../components/Testimonials";
import ContactCTA from "../components/ContactCTA";

const Home = () => {
  return (
    <>
      <Hero />
      <AboutAyurveda />
      <AyurvedicPrincipals />
      <Features />
      <Services />
      <Testimonials />
      <ContactCTA />
    </>
  );
};

export default Home;
