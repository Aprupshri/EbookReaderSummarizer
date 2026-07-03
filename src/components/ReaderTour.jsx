import React, { useState } from 'react';
import Joyride, { STATUS } from 'react-joyride';
import { tourStyles, tourLocale, TourCard } from './tourTheme';

const ReaderTour = ({ run, onComplete }) => {
    const [steps] = useState([
        {
            target: '#tour-summarize',
            content: (
                <TourCard title="AI Summaries">
                    Lost track of the plot? Click here instantly get an AI-generated summary of exactly what happened in this chapter.
                </TourCard>
            ),
            disableBeacon: true,
            placement: 'bottom',
        },
        {
            target: '#tour-recall',
            content: (
                <TourCard title="Recall Engine">
                    The Recall Engine uses active retrieval to strengthen your memory. It generates personalized questions based on what you've just read, helping you retain information longer and understand the book deeper.
                </TourCard>
            ),
            placement: 'bottom',
        },
        {
            target: '#tour-notes',
            content: (
                <TourCard title="Your Notes & Highlights">
                    Review all the highlights you've made, read your saved notes, and jump right back to those specific sections in the book.
                </TourCard>
            ),
            placement: 'bottom',
        },
        {
            target: '#tour-focus',
            content: (
                <TourCard title="Focus Mode">
                    Entering a deep reading session? Set a timer and block out distractions with Focus Mode.
                </TourCard>
            ),
            placement: 'bottom',
        },
        {
            target: '#tour-toc',
            content: (
                <TourCard title="Navigation">
                    Open the Table of Contents, check your reading progress, or jump to specific chapters here.
                </TourCard>
            ),
            placement: 'top',
        }
    ]);

    const handleJoyrideCallback = (data) => {
        const { status } = data;
        const finishedStatuses = [STATUS.FINISHED, STATUS.SKIPPED];

        if (finishedStatuses.includes(status)) {
            onComplete();
        }
    };

    return (
        <Joyride
            steps={steps}
            run={run}
            continuous={true}
            scrollToFirstStep={false}
            showProgress={true}
            showSkipButton={true}
            callback={handleJoyrideCallback}
            locale={tourLocale}
            styles={tourStyles}
        />
    );
};

export default ReaderTour;
