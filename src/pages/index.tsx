import { ReactElement, useState } from 'react';
import { GetStaticProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import Prismic from '@prismicio/client';
import { FiCalendar, FiUser } from 'react-icons/fi';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { getPrismicClient } from '../services/prismic';

import commonStyles from '../styles/common.module.scss';
import styles from './home.module.scss';

interface Post {
  uid?: string;
  first_publication_date: string | null;
  data: {
    title: string;
    subtitle: string;
    author: string;
  };
}

interface PostPagination {
  next_page: string;
  results: Post[];
}

interface HomeProps {
  postsPagination: PostPagination;
  preview: boolean;
}

export default function Home({
  postsPagination,
  preview,
}: HomeProps): ReactElement {
  const { results, next_page } = postsPagination;
  const [posts, setPosts] = useState<Post[]>(results);
  const [nextPage, setNextPage] = useState(next_page);
  const [currentPage, setCurrentPage] = useState(1);

  async function handleRetrievePosts(): Promise<void> {
    if (currentPage !== 1 && !next_page) {
      return;
    }

    const morePostsData = await fetch(`${nextPage}`).then(data => data.json());

    const morePosts = morePostsData.results.map((post: Post) => ({
      uid: post.uid,
      first_publication_date: format(
        new Date(post.first_publication_date),
        'dd MMM yyyy',
        { locale: ptBR }
      ),
      data: {
        title: post.data.title,
        subtitle: post.data.subtitle,
        author: post.data.author,
      },
    }));

    setNextPage(morePosts.next_page);
    setCurrentPage(morePosts.page);
    setPosts([...posts, ...morePosts]);
  }

  return (
    <>
      <Head>
        <title>Home | Spacetraveling</title>
      </Head>
      <section className={commonStyles.container}>
        {posts.map(post => (
          <Link href={`post/${post.uid}`} key={post.uid}>
            <a className={styles.post}>
              <h3>{post.data.title}</h3>
              <p>{post.data.subtitle}</p>
              <footer className={commonStyles.info}>
                <time>
                  <FiCalendar />
                  {format(
                    new Date(post.first_publication_date),
                    'dd MMM yyyy',
                    { locale: ptBR }
                  )}
                </time>
                <span>
                  <FiUser /> {post.data.author}
                </span>
              </footer>
            </a>
          </Link>
        ))}

        {nextPage && (
          <button
            type="button"
            className={styles.more}
            onClick={handleRetrievePosts}
          >
            Carregar mais posts
          </button>
        )}

        {preview && (
          <aside className={commonStyles.preview}>
            <Link href="/api/exit-preview">
              <a>Sair do modo Preview</a>
            </Link>
          </aside>
        )}
      </section>
    </>
  );
}

export const getStaticProps: GetStaticProps<HomeProps> = async ({
  preview = false,
  previewData,
}) => {
  const prismic = getPrismicClient();

  const postsResponse = await prismic.query(
    [Prismic.Predicates.at('document.type', 'posts')],
    {
      pageSize: 1,
      orderings: '[document.last_publication_date desc]',
      ref: previewData?.ref ?? null,
    }
  );

  const posts = postsResponse.results.map(post => ({
    uid: post.uid,
    first_publication_date: post.first_publication_date,
    data: {
      title: post.data.title,
      subtitle: post.data.subtitle,
      author: post.data.author,
    },
  }));

  const postsPagination = {
    next_page: postsResponse.next_page,
    results: posts,
  };

  return {
    props: {
      postsPagination,
      preview,
    },
    revalidate: 1800,
  };
};
