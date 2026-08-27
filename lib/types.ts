export interface Billboard {
  id: string;
  name: string; // display name, usually a domain: "omnicorp.biz"
  url: string;
  color: string; // brand color hex
  amount: number; // cumulative USD paid this cycle
}
