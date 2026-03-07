"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function Home() {
  useEffect(() => {
    const test = async () => {
      const { data, error } = await supabase.from("workspaces").select("*");
      console.log(data, error);
    };

    test();
  }, []);

  return <div>PatchMap Dev</div>;
}
