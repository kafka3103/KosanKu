import React, { useState, useEffect } from 'react';
import { Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { translateDynamicText } from '../../utils/translationService';

/**
 * A Text component that automatically translates its content when the language changes.
 * Used for dynamic database strings that are not in the static localization JSON files.
 * 
 * @param {object} props - React Native Text props + additional props
 * @param {string} props.children - The text to translate
 * @param {string} props.sourceLang - The original language of the text (default: 'id')
 */
const DynamicText = ({ children, sourceLang = 'id', style, ...props }) => {
  const { i18n } = useTranslation();
  const [translatedText, setTranslatedText] = useState(children);

  useEffect(() => {
    let isMounted = true;
    
    // If there's no children or it's not a string, just render it as is
    if (!children || typeof children !== 'string') {
      setTranslatedText(children);
      return;
    }

    const currentLang = i18n.language || 'id';

    // If current language matches the source language, no need to translate
    if (currentLang === sourceLang) {
      setTranslatedText(children);
      return;
    }

    const fetchTranslation = async () => {
      const result = await translateDynamicText(children, currentLang, sourceLang);
      if (isMounted) {
        setTranslatedText(result);
      }
    };

    fetchTranslation();

    return () => {
      isMounted = false;
    };
  }, [children, i18n.language, sourceLang]);

  return (
    <Text style={style} {...props}>
      {translatedText}
    </Text>
  );
};

export default DynamicText;
