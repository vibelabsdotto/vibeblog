import { blog } from "@/lib/blog";

export const dynamicParams = false;
export const generateStaticParams = blog.generateStaticParams;
export const generateMetadata = blog.generateMetadata;
export default blog.PostPage;
