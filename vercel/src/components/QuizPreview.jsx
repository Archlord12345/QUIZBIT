import React from 'react';
import { questionStats } from '../lib/format.js';
import { EmptyState, ModePill } from './ui.jsx';

export function QuizPreview({ questions }) {
  const list = Array.isArray(questions) ? questions : [];
  if (!list.length) return <EmptyState label="Aucune question." />;
  return (
    <div className="question-list">
      {list.map((question, index) => (
        <QuestionCard
          key={question.id || `${question.text}-${index}`}
          index={index}
          question={question}
        />
      ))}
    </div>
  );
}

function QuestionCard({ index, question }) {
  const type = question?.type === 'open' ? 'open' : 'mcq';
  const options = Array.isArray(question?.options)
    ? question.options.filter(Boolean)
    : [];
  const answer = question?.answer || 'Reponse manquante';
  return (
    <div className="question-card">
      <div className="question-top">
        <strong>#{index + 1}</strong>
        <ModePill mode={type} />
        {options.length > 5 && (
          <span className="warning-text">Max 5 choix</span>
        )}
      </div>
      <p>{question?.text || 'Question manquante'}</p>
      <div className="answer-line">
        Reponse: <strong>{answer}</strong>
      </div>
      {type === 'mcq' ? (
        <div className="choice-list">
          {options.slice(0, 5).map((option, optionIndex) => (
            <span
              key={`${option}-${optionIndex}`}
              className={option === answer ? 'choice good' : 'choice'}
            >
              {optionIndex + 1}. {option}
            </span>
          ))}
        </div>
      ) : (
        <small>Reponse libre analysee par Gemini.</small>
      )}
    </div>
  );
}

export function QuestionCounters({ questions }) {
  const stats = questionStats(questions);
  return (
    <div className="counter-stack">
      <ModePill mode="mcq" label={`QCM ${stats.mcq}`} />
      <ModePill mode="open" label={`Open ${stats.open}`} />
      {stats.tooManyChoices ? (
        <span className="warning-text">
          {stats.tooManyChoices} &gt; 5 choix
        </span>
      ) : null}
    </div>
  );
}
