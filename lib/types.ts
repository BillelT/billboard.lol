export interface Billboard {
  id: string;
  name: string; // display name, usually a domain: "omnicorp.biz"
  url: string;
  color: string; // brand color, read off the site's favicon
  amount: number; // cumulative USD paid this cycle
  title?: string | null; // the site's own SEO title
  description?: string | null; // the site's own meta description
  iconUrl?: string | null; // absolute URL of the site's favicon (proxied for display)
  category?: string | null;
}
