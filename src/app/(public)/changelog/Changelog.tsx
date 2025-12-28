import React from "react";
import { ChangelogSection } from "./changelog-data-en";

interface ChangelogProps {
  data: ChangelogSection[];
  footer: string;
  title: string;
}

export const Changelog: React.FC<ChangelogProps> = ({ data, footer, title }) => {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12 font-sans">
      <header className="text-center mb-12">
        <h1 className="text-3xl font-bold mb-2">{title}</h1>
      </header>

      <div className="space-y-16">
        {data.map((section, sectionIndex) => (
          <section key={sectionIndex}>
            <h2 className="text-2xl font-bold mb-8">{section.title}</h2>
            <div className="space-y-10">
              {section.versions.map((version, versionIndex) => (
                <article key={versionIndex}>
                  <h3 className="font-semibold text-xl mb-4">
                    <code>{version.version}</code> —{" "}
                    <em className="text-gray-600 dark:text-gray-400 font-normal">{version.date}</em>
                  </h3>
                  <ul className="list-disc list-outside pl-6 space-y-4 text-gray-800 dark:text-gray-200">
                    {version.items.map((item, itemIndex) => (
                      <li key={itemIndex}>
                        <strong
                          className="font-semibold text-gray-900 dark:text-gray-100"
                          dangerouslySetInnerHTML={{ __html: item.title }}
                        />
                        {item.description && (
                          <p
                            className="text-gray-700 dark:text-gray-300 mt-1"
                            dangerouslySetInnerHTML={{ __html: item.description }}
                          />
                        )}
                        {item.subitems && (
                          <div className="mt-1 pl-1 space-y-1">
                            {item.subitems.map((subitem, subitemIndex) => (
                              <p
                                key={subitemIndex}
                                className="text-gray-700 dark:text-gray-300"
                                dangerouslySetInnerHTML={{ __html: subitem }}
                              />
                            ))}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </section>
        ))}

        <footer className="text-center text-gray-500 dark:text-gray-400 pt-8 border-t border-gray-300 dark:border-gray-700">
          <p>{footer}</p>
        </footer>
      </div>
    </div>
  );
};
