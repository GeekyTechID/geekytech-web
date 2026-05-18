"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

interface FaqAccordionProps {
  id: string;
  question: string;
  answer: string;
  isDark: boolean;
}

export function FaqAccordion({ id, question, answer, isDark }: FaqAccordionProps) {
  const [isOpen, setIsOpen] = useState(false);

  const bgClass = isDark
    ? "bg-white dark:bg-[#272729]"
    : "bg-[#f5f5f7] dark:bg-[#272729]";

  const borderClass = isDark
    ? "border-[#e0e0e0] dark:border-[#3a3a3a]"
    : "border-[#e0e0e0] dark:border-[#3a3a3a]";

  return (
    <button
      onClick={() => setIsOpen(!isOpen)}
      className={`w-full text-left rounded-[18px] border transition-all ${bgClass} ${borderClass} p-6 hover:border-[#EA5329] dark:hover:border-[#FFAD88]`}
    >
      <div className="flex items-start justify-between gap-4">
        <h3 className="text-[17px] font-semibold text-[#1d1d1f] dark:text-white flex-1 text-left">
          {question}
        </h3>
        <ChevronDown
          className={`w-5 h-5 text-[#EA5329] flex-shrink-0 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </div>

      {isOpen && (
        <div className="mt-4 pt-4 border-t border-[#e0e0e0] dark:border-[#3a3a3a]">
          <p className="text-[15px] font-normal leading-[1.5] text-[#7a7a7a] dark:text-[#cccccc] whitespace-pre-line">
            {answer}
          </p>
        </div>
      )}
    </button>
  );
}
