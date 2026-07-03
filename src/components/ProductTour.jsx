import React, { useState } from 'react';
import Joyride, { STATUS } from 'react-joyride';
import { tourStyles, tourLocale, TourCard } from './tourTheme';

const ProductTour = ({ run, onComplete }) => {
    const [steps] = useState([
        {
            target: '#upload-btn',
            content: (
                <TourCard title="Add your Books">
                    Upload your favorite EPUBs and PDFs here. They'll be saved locally and sync across your reading sessions!
                </TourCard>
            ),
            disableBeacon: true,
            placement: 'bottom',
        },
        {
            target: '#physical-btn',
            content: (
                <TourCard title="Physical Books">
                    Reading a real paperback? Add it here so you can still track your reading sessions and maintain your streak.
                </TourCard>
            ),
            placement: 'bottom',
        },
        {
            target: '#settings-btn',
            content: (
                <TourCard title="AI Superpowers">
                    Add your Gemini API key here to unlock magical features like book summaries, explanations, and the Recall Engine.
                </TourCard>
            ),
            placement: 'left',
        },
        {
            target: '#streak-btn',
            content: (
                <TourCard title="Track Your Habit">
                    Check your reading stats, daily streaks, and past sessions here. Build a lasting reading habit!
                </TourCard>
            ),
            placement: 'bottom',
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
            scrollToFirstStep={true}
            showProgress={true}
            showSkipButton={true}
            callback={handleJoyrideCallback}
            locale={tourLocale}
            styles={tourStyles}
        />
    );
};

export default ProductTour;
