import { NextResponse } from "next/server";
import * as store from "@/lib/store";

export const dynamic = "force-dynamic";

const DEFAULT_OWNER = {
  fullName: "Ro'ziboyev Iqboljon Talibovich",
  yatt: "YaTT Ro'ziboyev Iqboljon Talibovich",
  jshshir: "30308920580088",
  passport: "AB 746 56 99",
  passportDate: "12.08.2017",
  activity: "Kompyuter dasturlarini ishlab chiqish xizmatlari",
  address: "Toshkent viloyati, Ohangaron tumani, Nurobod MFY, Nurobod qo'rg'oni ko'chasi 12 uy",
  guvohnoma: "5640805",
  guvohnomaDate: "15.09.2023",
  phone: "+998 93 585 05 07",
  bank: "Kapitalbank",
  hisob: "2020 8000 9051 5374 0002",
  mfo: "01057",
  inn: "303089205",
};

export async function GET() {
  const data = await store.getConfig("config", "owner_settings", DEFAULT_OWNER);
  return NextResponse.json({ ok: true, owner: data });
}
